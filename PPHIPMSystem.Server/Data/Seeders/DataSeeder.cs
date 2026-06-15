using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Models;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Data.Seeders;

public static class DataSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        await db.Database.MigrateAsync();

        await SeedDepartments(db);
        await SeedCategories(db);
        await SeedSuperAdmin(db, userManager);
        await SeedUsers(db, userManager);
        await SeedSuppliers(db);
    }

    private static async Task SeedDepartments(ApplicationDbContext db)
    {
        if (await db.Departments.AnyAsync()) return;

        var departments = new[]
        {
            new Department { Name = "Medicine Ward", Description = "General medicine and patient care ward" },
            new Department { Name = "Surgical Ward", Description = "Pre- and post-operative surgical care" },
            new Department { Name = "Pediatrics", Description = "Medical care for infants, children, and adolescents" },
            new Department { Name = "Obstetrics & Gynecology", Description = "Maternal and women reproductive health" },
            new Department { Name = "Emergency Department", Description = "Emergency and trauma care unit" },
            new Department { Name = "Pharmacy", Description = "Hospital pharmacy and drug dispensing" },
            new Department { Name = "Laboratory", Description = "Clinical laboratory and diagnostic services" },
            new Department { Name = "Radiology", Description = "Imaging and radiology services" },
            new Department { Name = "Administration", Description = "Hospital administration and management" },
            new Department { Name = "Central Supply", Description = "Central supply and sterile processing" }
        };

        await db.Departments.AddRangeAsync(departments);
        await db.SaveChangesAsync();
    }

    private static async Task SeedCategories(ApplicationDbContext db)
    {
        if (await db.Categories.AnyAsync()) return;

        var categories = new[]
        {
            new Category { Name = "Pharmaceutical - Oral", Description = "Tablets, capsules, and oral liquid preparations" },
            new Category { Name = "Pharmaceutical - Injectable", Description = "IV solutions, ampoules, and vials" },
            new Category { Name = "Medical-Surgical Supplies", Description = "Disposable medical-surgical consumables" },
            new Category { Name = "Personal Protective Equipment", Description = "Gloves, masks, gowns, and shields" },
            new Category { Name = "Laboratory Reagents", Description = "Reagents and consumables for laboratory use" },
            new Category { Name = "Linen and Bedding", Description = "Hospital bed linens and patient gowns" },
            new Category { Name = "Cleaning and Disinfectants", Description = "Housekeeping and infection control supplies" },
            new Category { Name = "Medical Equipment Accessories", Description = "Consumable accessories for medical equipment" }
        };

        await db.Categories.AddRangeAsync(categories);
        await db.SaveChangesAsync();
    }

    private static async Task SeedSuperAdmin(ApplicationDbContext db, UserManager<ApplicationUser> userManager)
    {
        if (await db.Users.AnyAsync(u => u.UserName == "superadmin")) return;

        var adminDept = await db.Departments.FirstAsync(d => d.Name == "Administration");

        var superAdmin = new ApplicationUser
        {
            EmployeeId = "SA-001",
            FirstName = "System",
            LastName = "Administrator",
            UserName = "superadmin",
            Email = "superadmin@pph.gov.ph",
            Role = UserRole.SuperAdmin,
            DepartmentId = adminDept.Id
        };

        var result = await userManager.CreateAsync(superAdmin, "PPHipm@2025!");
        if (!result.Succeeded)
        {
            var errors = string.Join("; ", result.Errors.Select(e => e.Description));
            throw new Exception($"Failed to seed SuperAdmin: {errors}");
        }
    }

    private static async Task SeedUsers(ApplicationDbContext db, UserManager<ApplicationUser> userManager)
    {
        if (await db.Users.AnyAsync(u => u.UserName == "admin.santos")) return;

        var adminDept = await db.Departments.FirstAsync(d => d.Name == "Administration");
        var pharmacyDept = await db.Departments.FirstAsync(d => d.Name == "Pharmacy");
        var supplyDept = await db.Departments.FirstAsync(d => d.Name == "Central Supply");
        var medWardDept = await db.Departments.FirstAsync(d => d.Name == "Medicine Ward");

        var users = new[]
        {
            new ApplicationUser
            {
                EmployeeId = "EMP-001",
                FirstName = "Maria",
                LastName = "Santos",
                UserName = "admin.santos",
                Email = "maria.santos@pph.gov.ph",
                Role = UserRole.HospitalAdministrator,
                DepartmentId = adminDept.Id
            },
            new ApplicationUser
            {
                EmployeeId = "EMP-002",
                FirstName = "Jose",
                LastName = "Reyes",
                UserName = "inv.reyes",
                Email = "jose.reyes@pph.gov.ph",
                Role = UserRole.InventoryOfficer,
                DepartmentId = supplyDept.Id
            },
            new ApplicationUser
            {
                EmployeeId = "EMP-003",
                FirstName = "Ana",
                LastName = "Dela Cruz",
                UserName = "proc.delacruz",
                Email = "ana.delacruz@pph.gov.ph",
                Role = UserRole.ProcurementStaff,
                DepartmentId = supplyDept.Id
            },
            new ApplicationUser
            {
                EmployeeId = "EMP-004",
                FirstName = "Ricardo",
                LastName = "Magno",
                UserName = "depthead.magno",
                Email = "ricardo.magno@pph.gov.ph",
                Role = UserRole.DepartmentHead,
                DepartmentId = medWardDept.Id
            },
            new ApplicationUser
            {
                EmployeeId = "EMP-005",
                FirstName = "Lourdes",
                LastName = "Bautista",
                UserName = "inv.bautista",
                Email = "lourdes.bautista@pph.gov.ph",
                Role = UserRole.InventoryOfficer,
                DepartmentId = pharmacyDept.Id
            }
        };

        foreach (var user in users)
        {
            var result = await userManager.CreateAsync(user, "PPHipm@2025!");
            if (!result.Succeeded)
            {
                var errors = string.Join("; ", result.Errors.Select(e => e.Description));
                throw new Exception($"Failed to seed user {user.UserName}: {errors}");
            }
        }
    }

    private static async Task SeedSuppliers(ApplicationDbContext db)
    {
        if (await db.Suppliers.AnyAsync()) return;

        var suppliers = new[]
        {
            new Supplier
            {
                Name = "Unilab Inc.",
                ContactPerson = "Mark Villanueva",
                Email = "procurement@unilab.com.ph",
                Phone = "02-8689-1111",
                Address = "66 United St., Mandaluyong City, Metro Manila",
                AccreditationNumber = "DOH-SUP-2024-001",
                IsAccredited = true,
                AccreditationExpiry = new DateTime(2026, 12, 31)
            },
            new Supplier
            {
                Name = "Medilink Corp.",
                ContactPerson = "Cynthia Lim",
                Email = "sales@medilink.com.ph",
                Phone = "02-8525-2222",
                Address = "Km 18, West Service Road, Paranaque City",
                AccreditationNumber = "DOH-SUP-2024-002",
                IsAccredited = true,
                AccreditationExpiry = new DateTime(2026, 6, 30)
            },
            new Supplier
            {
                Name = "PhilHealth Medical Supplies",
                ContactPerson = "Roberto Cruz",
                Email = "supply@philhealthmed.ph",
                Phone = "075-523-3333",
                Address = "Lingayen, Pangasinan",
                AccreditationNumber = "DOH-SUP-2024-003",
                IsAccredited = true,
                AccreditationExpiry = new DateTime(2025, 12, 31)
            },
            new Supplier
            {
                Name = "Pascual Laboratories Inc.",
                ContactPerson = "Elena Pascual",
                Email = "orders@pascuallabs.com.ph",
                Phone = "02-8921-4444",
                Address = "PALAD, Marikina City, Metro Manila",
                AccreditationNumber = "DOH-SUP-2024-004",
                IsAccredited = true,
                AccreditationExpiry = new DateTime(2027, 3, 31)
            }
        };

        await db.Suppliers.AddRangeAsync(suppliers);
        await db.SaveChangesAsync();
    }
}
